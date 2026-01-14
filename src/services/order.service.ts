import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';
import { MockOrder, MockOrderLineItem, MockShop, MockVariant } from '../database/entities';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(MockOrder) private orderRepository: Repository<MockOrder>,
    @InjectRepository(MockOrderLineItem) private lineItemRepository: Repository<MockOrderLineItem>,
    @InjectRepository(MockShop) private shopRepository: Repository<MockShop>,
    @InjectRepository(MockVariant) private variantRepository: Repository<MockVariant>,
  ) {}

  async createRandomOrder(): Promise<MockOrder> {
    try {
      // Get a random shop
      const shops = await this.shopRepository.find();
      if (shops.length === 0) {
        throw new Error('No shops found. Please seed the database first.');
      }
      const randomShop = shops[Math.floor(Math.random() * shops.length)];

      // Get random variants
      const variants = await this.variantRepository.find();
      if (variants.length === 0) {
        throw new Error('No variants found. Please seed the database first.');
      }

      // List of supported country codes (from MA1 Combat filter)
      const supportedCountries = [
        'US', 'UK', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 
        'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'
      ];
      
      // Pick a random country from supported list
      const countryCode = faker.helpers.arrayElement(supportedCountries);
      
      // Generate address data
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email();
      const phone = faker.phone.number();
      const address1 = faker.location.streetAddress();
      const address2 = faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.2 }) || '';
      const city = faker.location.city();
      const province = faker.location.state({ abbreviated: true });
      const zip = faker.location.zipCode();
      const company = faker.company.name();

      // Add random line items first to calculate total price
      const lineItemCount = faker.number.int({ min: 1, max: 5 });
      let totalPrice = 0;
      const lineItems = [];

      for (let i = 0; i < lineItemCount; i++) {
        const randomVariant = variants[Math.floor(Math.random() * variants.length)];
        const quantity = faker.number.int({ min: 1, max: 10 });
        const price = parseFloat(randomVariant.price.toString());
        const lineItemTotal = quantity * price;
        totalPrice += lineItemTotal;
        lineItems.push({
          id: uuidv4(),
          shopify_variant_id: randomVariant.shopify_id,
          title: `${randomVariant.title}`,
          sku: randomVariant.sku,
          quantity,
          price,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // Create order with complete faker data and calculated total price
      const createdAt = faker.date.past();
      const order = await this.orderRepository.save({
        id: uuidv4(),
        shop_id: randomShop.id,
        shopify_id: `order-${Date.now()}`,
        order_number: faker.number.int({ min: 1000, max: 99999 }),
        customer_email: faker.internet.email(),
        status: faker.helpers.arrayElement(['pending', 'confirmed', 'processing', 'completed']),
        fulfillment_status: 'unshipped',
        shipping_address: {
          firstName,
          lastName,
          email,
          address1,
          address2,
          city,
          company,
          country: countryCode,
          countryCode, // Country code (2-letter)
          countryCodeV2: countryCode, // Shopify v2 country code
          phone,
          province,
          provinceCode: province,
          zip,
          name: `${firstName} ${lastName}`,
        },
        metadata: {
          source: faker.helpers.arrayElement(['web', 'mobile', 'api']),
          channel: faker.helpers.arrayElement(['online_store', 'instagram', 'facebook']),
          utm_source: faker.helpers.maybe(() => faker.lorem.word(), { probability: 0.5 }),
          utm_campaign: faker.helpers.maybe(() => faker.lorem.word(), { probability: 0.5 }),
          discount_code: faker.helpers.maybe(() => faker.random.alphaNumeric(8).toUpperCase(), { probability: 0.2 }),
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
          tags: faker.helpers.maybe(() => [faker.lorem.word(), faker.lorem.word()], { probability: 0.4 }),
        },
        total_price: parseFloat(totalPrice.toFixed(2)),
      });

      // Save line items with order_id
      for (const lineItem of lineItems) {
        await this.lineItemRepository.save({
          id: lineItem.id,
          order_id: order.id,
          shopify_variant_id: lineItem.shopify_variant_id,
          title: lineItem.title,
          sku: lineItem.sku,
          quantity: lineItem.quantity,
          price: lineItem.price,
          created_at: lineItem.created_at,
          updated_at: lineItem.updated_at,
        });
      }

      this.logger.log(
        `Created order ${order.shopify_id} #${order.order_number} for ${order.customer_email} with ${lineItemCount} line items. Total: $${order.total_price}`,
      );

      // Return order with relations
      return await this.orderRepository.findOne({
        where: { id: order.id },
        relations: ['line_items', 'fulfillments'],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create random order: ${errorMessage}`);
      throw error;
    }
  }
}
