import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GraphQLController, AdminController } from './controllers';
import { GraphQLService, SeedService } from './services';
import {
  MockShop,
  MockProduct,
  MockVariant,
  MockOrder,
  MockOrderLineItem,
  MockFulfillment,
} from './database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'shopify_mock',
      entities: [MockShop, MockProduct, MockVariant, MockOrder, MockOrderLineItem, MockFulfillment],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([
      MockShop,
      MockProduct,
      MockVariant,
      MockOrder,
      MockOrderLineItem,
      MockFulfillment,
    ]),
  ],
  controllers: [GraphQLController, AdminController],
  providers: [GraphQLService, SeedService],
})
export class AppModule {}
