import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SeedService } from '../services/seed.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MockOrder, MockShop } from '../database/entities';

@Controller('admin')
@ApiTags('Admin')
export class AdminController {
  constructor(
    private seedService: SeedService,
    @InjectRepository(MockOrder) private orderRepository: Repository<MockOrder>,
    @InjectRepository(MockShop) private shopRepository: Repository<MockShop>,
  ) {}

  @Post('seed')
  @ApiOperation({
    summary: 'Load test data',
    description: 'Seed the database with sample shops, products, variants, and orders for testing',
  })
  @ApiResponse({
    status: 201,
    description: 'Test data loaded successfully',
    schema: {
      example: { message: 'Database seeded successfully' },
    },
  })
  async seed(): Promise<{ message: string }> {
    await this.seedService.seedTestData();
    return { message: 'Database seeded successfully' };
  }

  @Post('reset')
  @ApiOperation({
    summary: 'Reset database',
    description: 'Clear all data from the database (shops, products, orders, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Database reset successfully',
    schema: {
      example: { message: 'Database reset successfully' },
    },
  })
  async reset(): Promise<{ message: string }> {
    await this.seedService.resetData();
    return { message: 'Database reset successfully' };
  }

  @Get('orders')
  @ApiOperation({
    summary: 'List all orders',
    description: 'Get all mock orders with their line items and fulfillments',
  })
  @ApiResponse({
    status: 200,
    description: 'List of orders',
    schema: {
      example: {
        orders: [
          {
            id: 'uuid',
            shopify_id: 'order-001',
            order_number: 1001,
            customer_email: 'customer@example.com',
            fulfillment_status: 'unshipped',
            line_items: [],
            fulfillments: [],
          },
        ],
      },
    },
  })
  async getOrders(): Promise<any> {
    const orders = await this.orderRepository.find({
      relations: ['line_items', 'fulfillments'],
    });
    return { orders };
  }

  @Get('orders/:id')
  @ApiOperation({
    summary: 'Get specific order',
    description: 'Retrieve details of a specific order by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Order details',
    schema: {
      example: {
        order: {
          id: 'uuid',
          shopify_id: 'order-001',
          order_number: 1001,
          customer_email: 'customer@example.com',
          fulfillment_status: 'unshipped',
        },
      },
    },
  })
  async getOrder(@Param('id') id: string): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['line_items', 'fulfillments'],
    });
    return { order };
  }

  @Post('orders/:id/status')
  @ApiOperation({
    summary: 'Update order fulfillment status',
    description: 'Change the fulfillment status of an order (unshipped, shipped, delivered, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({
    schema: {
      example: { fulfillment_status: 'shipped' },
      properties: {
        fulfillment_status: {
          type: 'string',
          enum: ['unshipped', 'shipped', 'delivered', 'cancelled'],
          description: 'New fulfillment status',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order status updated',
    schema: {
      example: {
        message: 'Order status updated',
        order: {
          id: 'uuid',
          fulfillment_status: 'shipped',
        },
      },
    },
  })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { fulfillment_status: string },
  ): Promise<any> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      return { error: 'Order not found' };
    }

    order.fulfillment_status = body.fulfillment_status;
    await this.orderRepository.save(order);

    return { message: 'Order status updated', order };
  }

  @Get('shops')
  @ApiOperation({
    summary: 'List all shops',
    description: 'Get all mock shops with their credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'List of shops',
    schema: {
      example: {
        shops: [
          {
            id: 'uuid',
            shop_name: 'test-shop.myshopify.com',
            access_token: 'shpat_1234567890abcdef',
          },
        ],
      },
    },
  })
  async getShops(): Promise<any> {
    const shops = await this.shopRepository.find();
    return { shops };
  }
}
