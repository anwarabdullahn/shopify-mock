import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MockOrder, MockProduct, MockVariant, MockShop } from '../database/entities';

@Injectable()
export class GraphQLService {
  private readonly logger = new Logger(GraphQLService.name);

  constructor(
    @InjectRepository(MockShop) private shopRepository: Repository<MockShop>,
    @InjectRepository(MockOrder) private orderRepository: Repository<MockOrder>,
    @InjectRepository(MockProduct) private productRepository: Repository<MockProduct>,
    @InjectRepository(MockVariant) private variantRepository: Repository<MockVariant>,
  ) {}

  async getShopByToken(token: string): Promise<MockShop | null> {
    if (!token || token === 'default') {
      // Return the first/default shop using query builder
      return this.shopRepository
        .createQueryBuilder('shop')
        .orderBy('shop.created_at', 'ASC')
        .limit(1)
        .getOne();
    }
    return this.shopRepository.findOne({ where: { access_token: token } });
  }

  async handleGraphQLQuery(shopId: string, query: string, variables?: any): Promise<any> {
    this.logger.debug(`Processing GraphQL query for shop ${shopId}`);

    // Normalize query by removing whitespace around parentheses for easier matching
    const normalizedQuery = query.replace(/\s+/g, ' ');

    if (normalizedQuery.includes('orders(')) {
      return this.getOrders(shopId, variables);
    }

    if (normalizedQuery.includes('order(') || normalizedQuery.includes('query {')) {
      return this.getOrder(shopId, query, variables);
    }

    if (normalizedQuery.includes('productVariants')) {
      return this.getProductVariants(shopId, variables);
    }

    throw new Error('Unsupported query');
  }

  async handleGraphQLMutation(shopId: string, mutation: string, variables?: any): Promise<any> {
    this.logger.debug(`Processing GraphQL mutation for shop ${shopId}`);

    if (mutation.includes('fulfillmentCreate')) {
      return this.createFulfillment(shopId, variables);
    }

    if (mutation.includes('inventorySetQuantities')) {
      return this.updateInventoryQuantities(shopId, variables);
    }

    throw new Error('Unsupported mutation');
  }

  private async getOrders(shopId: string, variables?: any): Promise<any> {
    const first = variables?.first || 100;
    const after = variables?.after;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.line_items', 'line_items')
      .leftJoinAndSelect('order.fulfillments', 'fulfillments')
      .where('order.shop_id = :shopId', { shopId })
      .orderBy('order.created_at', 'DESC')
      .take(first);

    // Filter by fulfillment status if specified
    const fulfillmentStatus = variables?.fulfillment_status || 'unshipped';
    if (fulfillmentStatus) {
      queryBuilder.andWhere('order.fulfillment_status = :status', { status: fulfillmentStatus });
    }

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: {
        orders: {
          edges: orders.map((order) => ({
            node: this.mapOrderToShopifyResponse(order),
            cursor: Buffer.from(order.id).toString('base64'),
          })),
          pageInfo: {
            hasNextPage: total > first,
            endCursor: orders.length > 0 ? Buffer.from(orders[orders.length - 1].id).toString('base64') : null,
          },
        },
      },
    };
  }

  private async getOrder(shopId: string, query?: string, variables?: any): Promise<any> {
    let orderId = variables?.id || variables?.orderId;
    
    // Extract order ID from the query string if variables don't have it
    if (!orderId && query) {
      const match = query.match(/order\(id:\s*"([^"]+)"/);
      if (match) {
        orderId = match[1];
      }
    }
    
    // Extract the actual order ID from gid://shopify/Order/xxx format
    if (orderId && orderId.includes('gid://shopify/Order/')) {
      orderId = orderId.replace('gid://shopify/Order/', '');
    }
    
    this.logger.debug(`Fetching order with ID: ${orderId}`);

    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.line_items', 'line_items')
      .leftJoinAndSelect('order.fulfillments', 'fulfillments')
      .where('order.shop_id = :shopId', { shopId })
      .andWhere('order.shopify_id = :orderId', { orderId })
      .getOne();

    if (!order) {
      return {
        data: {
          order: null,
        },
        errors: [{ message: 'Order not found' }],
      };
    }

    return {
      data: {
        order: this.mapOrderToShopifyResponse(order),
      },
    };
  }

  private async getProductVariants(shopId: string, variables?: any): Promise<any> {
    const first = variables?.first || 10;

    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('product.shop_id = :shopId', { shopId })
      .orderBy('variant.created_at', 'DESC')
      .take(first)
      .getMany();

    return {
      data: {
        productVariants: {
          edges: variants.map((variant) => ({
            node: this.mapVariantToShopifyResponse(variant),
            cursor: Buffer.from(variant.id).toString('base64'),
          })),
        },
      },
    };
  }

  private async createFulfillment(shopId: string, variables?: any): Promise<any> {
    this.logger.debug(`Creating fulfillment for order ${variables?.orderId}`);

    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.line_items', 'line_items')
      .where('order.shop_id = :shopId', { shopId })
      .andWhere('order.shopify_id = :orderId', { orderId: variables?.orderId })
      .getOne();

    if (!order) {
      return {
        data: null,
        errors: [{ message: 'Order not found' }],
      };
    }

    return {
      data: {
        fulfillmentCreate: {
          fulfillment: {
            id: `gid://shopify/Fulfillment/1`,
            status: 'SUCCESS',
            trackingInfo: {
              number: variables?.trackingNumber,
              url: variables?.trackingUrl,
            },
            lineItems: variables?.lineItems || [],
          },
          userErrors: [],
        },
      },
    };
  }

  private async updateInventoryQuantities(shopId: string, variables?: any): Promise<any> {
    this.logger.debug(`Updating inventory quantities`);

    const variantId = variables?.variantId;
    const quantity = variables?.quantity;

    const variant = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('product.shop_id = :shopId', { shopId })
      .andWhere('variant.shopify_id = :variantId', { variantId })
      .getOne();

    if (!variant) {
      return {
        data: null,
        errors: [{ message: 'Variant not found' }],
      };
    }

    variant.quantity = quantity;
    await this.variantRepository.save(variant);

    return {
      data: {
        inventorySetQuantities: {
          inventoryLevel: {
            quantities: [
              {
                name: 'available',
                quantity,
              },
            ],
          },
          userErrors: [],
        },
      },
    };
  }

  private mapOrderToShopifyResponse(order: MockOrder): any {
    const shippingAddr = order.shipping_address as any || {};
    
    return {
      id: `gid://shopify/Order/${order.shopify_id}`,
      name: `#${order.order_number}`,
      email: order.customer_email,
      currencyCode: 'USD', // Default currency code
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      fulfillmentStatus: order.fulfillment_status.toUpperCase(),
      lineItems: {
        edges: (order.line_items || []).map((item) => ({
          node: {
            id: `gid://shopify/LineItem/${item.id}`,
            variantId: `gid://shopify/ProductVariant/${item.shopify_variant_id}`,
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
            originalPrice: item.price,
          },
        })),
      },
      shippingAddress: {
        address1: shippingAddr.address1,
        address2: shippingAddr.address2,
        city: shippingAddr.city,
        company: shippingAddr.company,
        country: shippingAddr.country,
        countryCodeV2: shippingAddr.country || 'US', // Default to US if not provided
        firstName: shippingAddr.firstName,
        lastName: shippingAddr.lastName,
        name: shippingAddr.name,
        phone: shippingAddr.phone,
        province: shippingAddr.province,
        provinceCode: shippingAddr.provinceCode,
        zip: shippingAddr.zip,
      },
      totalPrice: order.total_price.toString(),
      fulfillments: {
        edges: (order.fulfillments || []).map((fulfillment) => ({
          node: {
            id: `gid://shopify/Fulfillment/${fulfillment.shopify_id}`,
            status: fulfillment.status.toUpperCase(),
            trackingInfo: {
              number: fulfillment.tracking_number,
              url: fulfillment.tracking_url,
            },
          },
        })),
      },
    };
  }

  private mapVariantToShopifyResponse(variant: MockVariant): any {
    return {
      id: `gid://shopify/ProductVariant/${variant.shopify_id}`,
      title: variant.title,
      sku: variant.sku,
      price: variant.price.toString(),
      inventoryQuantity: variant.quantity,
    };
  }
}
