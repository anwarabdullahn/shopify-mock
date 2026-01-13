import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MockShop, MockProduct, MockVariant, MockOrder, MockOrderLineItem } from '../database/entities';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(MockShop) private shopRepository: Repository<MockShop>,
    @InjectRepository(MockProduct) private productRepository: Repository<MockProduct>,
    @InjectRepository(MockVariant) private variantRepository: Repository<MockVariant>,
    @InjectRepository(MockOrder) private orderRepository: Repository<MockOrder>,
    @InjectRepository(MockOrderLineItem) private lineItemRepository: Repository<MockOrderLineItem>,
  ) {}

  async seedTestData(): Promise<void> {
    this.logger.log('Starting database seed...');

    // Create shop
    const shop = await this.shopRepository.save({
      id: uuidv4(),
      shop_name: process.env.SHOPIFY_SHOP_NAME || 'test-shop.myshopify.com',
      access_token: process.env.SHOPIFY_ACCESS_TOKEN || 'shpat_1234567890abcdef',
    });

    this.logger.log(`Created shop: ${shop.id}`);

    // Create products
    const product1 = await this.productRepository.save({
      id: uuidv4(),
      shop_id: shop.id,
      shopify_id: '123456789',
      title: 'Test Product 1',
      description: 'A test product for mock integration',
      images: [],
    });

    const product2 = await this.productRepository.save({
      id: uuidv4(),
      shop_id: shop.id,
      shopify_id: '987654321',
      title: 'Test Product 2',
      description: 'Another test product',
      images: [],
    });

    this.logger.log(`Created 2 products`);

    // Create variants
    const variant1 = await this.variantRepository.save({
      id: uuidv4(),
      product_id: product1.id,
      shopify_id: 'gid://shopify/ProductVariant/1001',
      sku: 'PROD-001',
      title: 'Red - Small',
      price: 29.99,
      quantity: 100,
    });

    const variant2 = await this.variantRepository.save({
      id: uuidv4(),
      product_id: product1.id,
      shopify_id: 'gid://shopify/ProductVariant/1002',
      sku: 'PROD-002',
      title: 'Blue - Medium',
      price: 29.99,
      quantity: 50,
    });

    const variant3 = await this.variantRepository.save({
      id: uuidv4(),
      product_id: product2.id,
      shopify_id: 'gid://shopify/ProductVariant/2001',
      sku: 'PROD2-001',
      title: 'Standard',
      price: 49.99,
      quantity: 75,
    });

    this.logger.log(`Created 3 variants`);

    // Create test orders
    const order1 = await this.orderRepository.save({
      id: uuidv4(),
      shop_id: shop.id,
      shopify_id: 'order-001',
      order_number: 1001,
      customer_email: 'customer1@example.com',
      status: 'confirmed',
      fulfillment_status: 'unshipped',
      shipping_address: {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        province: 'NY',
        zip: '10001',
        country: 'US',
      },
      total_price: 59.98,
    });

    const order2 = await this.orderRepository.save({
      id: uuidv4(),
      shop_id: shop.id,
      shopify_id: 'order-002',
      order_number: 1002,
      customer_email: 'customer2@example.com',
      status: 'confirmed',
      fulfillment_status: 'unshipped',
      shipping_address: {
        firstName: 'Jane',
        lastName: 'Smith',
        address1: '456 Oak Ave',
        city: 'Los Angeles',
        province: 'CA',
        zip: '90001',
        country: 'US',
      },
      total_price: 49.99,
    });

    this.logger.log(`Created 2 orders`);

    // Create line items
    await this.lineItemRepository.save({
      id: uuidv4(),
      order_id: order1.id,
      shopify_variant_id: variant1.shopify_id,
      title: 'Test Product 1 - Red - Small',
      sku: 'PROD-001',
      quantity: 2,
      price: 29.99,
    });

    await this.lineItemRepository.save({
      id: uuidv4(),
      order_id: order2.id,
      shopify_variant_id: variant3.shopify_id,
      title: 'Test Product 2 - Standard',
      sku: 'PROD2-001',
      quantity: 1,
      price: 49.99,
    });

    this.logger.log(`Created line items`);
    this.logger.log('Database seeding completed successfully');
  }

  async resetData(): Promise<void> {
    this.logger.log('Resetting database...');

    await this.lineItemRepository.delete({});
    await this.orderRepository.delete({});
    await this.variantRepository.delete({});
    await this.productRepository.delete({});
    await this.shopRepository.delete({});

    this.logger.log('Database reset completed');
  }
}
