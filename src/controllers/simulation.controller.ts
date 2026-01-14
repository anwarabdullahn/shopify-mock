import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { OrderService } from '../services/order.service';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MockOrder } from '../database/entities';
import axios from 'axios';

@Controller('simulation')
@ApiTags('Simulation')
export class SimulationController {
  private readonly logger = new Logger(SimulationController.name);

  constructor(
    private orderService: OrderService,
    @InjectRepository(MockOrder) private orderRepository: Repository<MockOrder>,
  ) {}

  @Post('create-orders')
  @ApiOperation({
    summary: 'Create multiple random orders',
    description: 'Generate multiple random orders for simulation testing',
  })
  @ApiBody({
    schema: {
      properties: {
        count: { type: 'number', default: 5, description: 'Number of orders to create' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Orders created successfully',
    schema: {
      example: {
        success: true,
        ordersCreated: 5,
        orders: [{ id: 'uuid', order_number: 1234 }],
      },
    },
  })
  async createMultipleOrders(@Body() body: { count?: number }): Promise<any> {
    const count = body.count || 5;
    const orders = [];

    for (let i = 0; i < count; i++) {
      try {
        const order = await this.orderService.createRandomOrder();
        orders.push({
          id: order.id,
          shopify_id: order.shopify_id,
          order_number: order.order_number,
          customer_email: order.customer_email,
          total_price: order.total_price,
        });
        this.logger.log(`Created order ${i + 1}/${count}: ${order.shopify_id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to create order ${i + 1}: ${errorMessage}`);
      }
    }

    return {
      success: true,
      ordersCreated: orders.length,
      orders,
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get simulation status',
    description: 'Get current state of all orders in the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Simulation status',
    schema: {
      example: {
        totalOrders: 10,
        byStatus: {
          unshipped: 5,
          shipped: 3,
          delivered: 2,
        },
      },
    },
  })
  async getSimulationStatus(): Promise<any> {
    const orders = await this.orderRepository.find({
      relations: ['line_items', 'fulfillments'],
    });

    const byStatus = orders.reduce((acc, order) => {
      const status = order.fulfillment_status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders: orders.length,
      byStatus,
      recentOrders: orders.slice(-5).map(o => ({
        id: o.id,
        shopify_id: o.shopify_id,
        order_number: o.order_number,
        status: o.fulfillment_status,
        total_price: o.total_price,
      })),
    };
  }

  @Post('trigger-backend-sync')
  @ApiOperation({
    summary: 'Trigger backend order sync',
    description: 'Notify the backend to sync orders from Shopify (if backend supports webhook)',
  })
  @ApiBody({
    schema: {
      properties: {
        backendUrl: { type: 'string', default: 'http://localhost:3001', description: 'Backend API URL' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sync triggered',
  })
  async triggerBackendSync(@Body() body: { backendUrl?: string }): Promise<any> {
    const backendUrl = body.backendUrl || process.env.BACKEND_URL || 'http://localhost:3001';
    
    try {
      const response = await axios.post(`${backendUrl}/api/orders/sync`, {}, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });
      
      return {
        success: true,
        message: 'Backend sync triggered',
        response: response.data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Could not trigger backend sync: ${errorMessage}`,
        hint: 'The backend syncs orders automatically via cron job every 30 seconds',
      };
    }
  }

  @Post('full-flow')
  @ApiOperation({
    summary: 'Simulate full order flow',
    description: 'Create orders and provide instructions for the complete flow simulation',
  })
  @ApiBody({
    schema: {
      properties: {
        orderCount: { type: 'number', default: 3, description: 'Number of orders to create' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Full flow simulation started',
    schema: {
      example: {
        success: true,
        step1: 'Orders created in Shopify Mock',
        step2: 'Backend will sync orders within 30 seconds',
        step3: 'Backend will push orders to T-Logistics',
        step4: 'T-Logistics will process orders through statuses',
        orders: [],
      },
    },
  })
  async simulateFullFlow(@Body() body: { orderCount?: number }): Promise<any> {
    const count = body.orderCount || 3;
    
    const orders = [];
    for (let i = 0; i < count; i++) {
      try {
        const order = await this.orderService.createRandomOrder();
        orders.push({
          id: order.id,
          shopify_id: order.shopify_id,
          order_number: order.order_number,
          total_price: order.total_price,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to create order: ${errorMessage}`);
      }
    }

    return {
      success: true,
      message: 'Full flow simulation initiated',
      ordersCreated: orders.length,
      orders,
      flow: {
        step1: {
          status: 'completed',
          description: `${orders.length} orders created in Shopify Mock`,
        },
        step2: {
          status: 'pending',
          description: 'Backend will sync orders within 30 seconds via cron job',
          endpoint: 'Backend: GET /api/orders/sync (automatic)',
        },
        step3: {
          status: 'pending',
          description: 'Backend will push orders to T-Logistics warehouse',
          endpoint: 'T-Logistics: POST /api/tlogistics-mock (SOAP XML)',
        },
        step4: {
          status: 'pending',
          description: 'T-Logistics will process orders: created → allocated → picked → packed → shipped',
        },
        step5: {
          status: 'pending',
          description: 'Backend will sync shipping manifests and update Shopify fulfillment',
        },
      },
      monitoring: {
        shopifyOrders: 'GET http://localhost:3100/admin/orders',
        shopifySimStatus: 'GET http://localhost:3100/simulation/status',
        tlogisticsOrders: 'GET http://localhost:3010/api/tlogistics-mock/admin/orders',
        tlogisticsTracking: 'POST http://localhost:3010/api/tlogistics-mock/tracking',
      },
    };
  }
}
