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

  async handleGraphQLQuery(shopId: string, query: string, variables?: any): Promise<any> {
    this.logger.debug(`Processing GraphQL query for shop ${shopId}`);

    if (query.includes('orders(first:')) {
      return this.getOrders(shopId, variables);
    }

    if (query.includes('order(id:') || query.includes('query {')) {
      return this.getOrder(shopId, variables);
    }

    if (query.includes('productVariants')) {
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
    const first = variables?.first || 10;
    const after = variables?.after;

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.line_items', 'line_items')
      .where('order.shop_id = :shopId', { shopId })
      .andWhere('order.fulfillment_status = :status', { status: 'unshipped' })
      .orderBy('order.created_at', 'DESC')
      .take(first);

    const [orders, total] = await query.getManyAndCount();

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

  private async getOrder(shopId: string, variables?: any): Promise<any> {
    const orderId = variables?.id || variables?.orderId;

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
    return {
      id: `gid://shopify/Order/${order.shopify_id}`,
      name: `#${order.order_number}`,
      email: order.customer_email,
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
      shippingAddress: order.shipping_address,
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
