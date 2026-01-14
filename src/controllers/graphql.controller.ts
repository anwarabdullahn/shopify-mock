import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GraphQLService } from '../services/graphql.service';

interface GraphQLRequest {
  query: string;
  variables?: any;
  operationName?: string;
}

@Controller('graphql.json')
@ApiTags('GraphQL')
export class GraphQLController {
  constructor(private graphqlService: GraphQLService) {}

  @Post()
  @ApiOperation({
    summary: 'Shopify GraphQL API endpoint',
    description: `Execute GraphQL queries and mutations compatible with Shopify's API.
    
Supported queries:
- orders(first: Int) - List unshipped orders
- order(id: ID!) - Get single order details
- productVariants(first: Int) - List product variants

Supported mutations:
- fulfillmentCreate(...) - Create order fulfillment
- inventorySetQuantities(...) - Update inventory levels`,
  })
  @ApiBearerAuth('access-token')
  @ApiBody({
    schema: {
      example: {
        query: `{
  orders(first: 10) {
    edges {
      node {
        id
        name
        email
        fulfillmentStatus
        lineItems {
          edges {
            node {
              id
              title
              sku
              quantity
            }
          }
        }
      }
    }
  }
}`,
        variables: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'GraphQL response',
    schema: {
      example: {
        data: {
          orders: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Order/123',
                  name: '#1001',
                  email: 'customer@example.com',
                  fulfillmentStatus: 'UNSHIPPED',
                },
              },
            ],
          },
        },
      },
    },
  })
  async handleGraphQL(@Body() req: GraphQLRequest): Promise<any> {
    if (!req.query) {
      throw new BadRequestException('Query is required');
    }

    let shopId = 'default-shop'; // Default fallback
    
    // Try to extract shop from headers if available
    // In production, you would validate the token against a real Shopify API
    const authHeader = req.variables?.['X-Shopify-Access-Token'] || 'default';
    
    // For now, use the shop associated with the first shop in database
    // In production, map the access token to the actual shop
    const shop = await this.graphqlService.getShopByToken(authHeader);
    if (shop) {
      shopId = shop.id;
    }
    
    const query = req.query.trim();

    try {
      if (query.startsWith('mutation')) {
        return this.graphqlService.handleGraphQLMutation(shopId, query, req.variables);
      } else if (query.startsWith('query') || query.includes('orders') || query.includes('order')) {
        return this.graphqlService.handleGraphQLQuery(shopId, query, req.variables);
      }

      throw new BadRequestException('Invalid GraphQL query');
    } catch (error: any) {
      return {
        data: null,
        errors: [
          {
            message: error?.message || 'Unknown error',
          },
        ],
      };
    }
  }
}
