# Requirements Document

## Introduction

本文档定义了将 Fish Art 项目的数据库从当前的 Hasura + PostgreSQL 架构完全迁移到 Supabase 的需求。迁移将利用 Supabase MCP（Model Context Protocol）工具来提高效率，确保数据完整性和业务连续性。

## Glossary

- **Supabase**: 开源的 Firebase 替代方案，提供 PostgreSQL 数据库、认证、实时订阅、存储等服务
- **Hasura**: 当前使用的 GraphQL 引擎，连接到 PostgreSQL 数据库
- **MCP (Model Context Protocol)**: Supabase 提供的 AI 辅助工具协议，用于数据库操作
- **RLS (Row Level Security)**: Supabase 的行级安全策略，用于数据访问控制
- **Migration System**: 数据库迁移系统，用于版本化管理数据库结构变更
- **Fish Art System**: 当前的鱼画应用系统
- **GraphQL API**: 当前通过 Hasura 提供的数据查询接口

## Requirements

### Requirement 1

**User Story:** As a developer, I want to migrate all database tables to Supabase, so that I can consolidate the database infrastructure and reduce operational complexity.

#### Acceptance Criteria

1. WHEN the migration is complete THEN the Supabase database SHALL contain all tables from the current Hasura database with identical schema structures
2. WHEN migrating table schemas THEN the Migration System SHALL preserve all column types, constraints, indexes, and default values
3. WHEN migrating foreign key relationships THEN the Migration System SHALL maintain referential integrity between all related tables
4. WHEN the migration is complete THEN the Migration System SHALL generate SQL migration files for version control

### Requirement 2

**User Story:** As a developer, I want to migrate all existing data to Supabase, so that users can continue using the application without data loss.

#### Acceptance Criteria

1. WHEN migrating data THEN the Migration System SHALL transfer all records from each table without data loss
2. WHEN migrating data THEN the Migration System SHALL preserve all UUID primary keys and foreign key references
3. WHEN migrating timestamp data THEN the Migration System SHALL maintain timezone information and temporal accuracy
4. WHEN migrating JSONB fields THEN the Migration System SHALL preserve the complete JSON structure and content
5. WHEN data migration is complete THEN the Migration System SHALL provide a verification report comparing record counts between source and target databases

### Requirement 3

**User Story:** As a developer, I want to implement Row Level Security policies in Supabase, so that data access is properly controlled at the database level.

#### Acceptance Criteria

1. WHEN RLS is configured THEN the Supabase database SHALL enforce user-based access control for the users table
2. WHEN RLS is configured THEN the Supabase database SHALL allow users to read and modify only their own fish records
3. WHEN RLS is configured THEN the Supabase database SHALL restrict payment and subscription data access to the owning user
4. WHEN RLS is configured THEN the Supabase database SHALL allow public read access to approved fish for the community tank feature
5. WHEN RLS is configured THEN the Supabase database SHALL restrict admin operations to users with admin role

### Requirement 4

**User Story:** As a developer, I want to replace Hasura GraphQL calls with Supabase client calls, so that the application uses a unified data access layer.

#### Acceptance Criteria

1. WHEN refactoring the data layer THEN the Fish Art System SHALL replace all Hasura query calls with Supabase client queries
2. WHEN refactoring the data layer THEN the Fish Art System SHALL replace all Hasura mutation calls with Supabase client mutations
3. WHEN refactoring is complete THEN the Fish Art System SHALL maintain identical API response structures for frontend compatibility
4. WHEN refactoring is complete THEN the Fish Art System SHALL remove all Hasura-specific dependencies and configuration

### Requirement 5

**User Story:** As a developer, I want to implement database triggers and functions in Supabase, so that business logic currently handled by Hasura is preserved.

#### Acceptance Criteria

1. WHEN migrating triggers THEN the Supabase database SHALL implement the updated_at timestamp trigger for all relevant tables
2. WHEN migrating triggers THEN the Supabase database SHALL implement the fish count update trigger for user statistics
3. WHEN migrating functions THEN the Supabase database SHALL implement any custom PostgreSQL functions used by the application
4. WHEN triggers are implemented THEN the Supabase database SHALL execute them with the same behavior as the current system

### Requirement 6

**User Story:** As a developer, I want to use Supabase MCP tools during migration, so that I can efficiently execute database operations and verify results.

#### Acceptance Criteria

1. WHEN using Supabase MCP THEN the Migration System SHALL leverage MCP tools for schema introspection and table creation
2. WHEN using Supabase MCP THEN the Migration System SHALL use MCP tools to execute and verify SQL migrations
3. WHEN using Supabase MCP THEN the Migration System SHALL utilize MCP tools for data validation and integrity checks
4. WHEN migration errors occur THEN the Migration System SHALL provide clear error messages and rollback capabilities

### Requirement 7

**User Story:** As a developer, I want to implement a rollback strategy, so that I can revert to the previous system if critical issues are discovered.

#### Acceptance Criteria

1. WHEN planning the migration THEN the Migration System SHALL maintain the existing Hasura system operational during migration
2. WHEN implementing rollback THEN the Migration System SHALL provide a configuration switch to toggle between Hasura and Supabase backends
3. WHEN rollback is triggered THEN the Fish Art System SHALL restore full functionality using the Hasura backend within 5 minutes
4. WHEN migration is verified successful THEN the Migration System SHALL provide a cleanup procedure for the deprecated Hasura infrastructure

### Requirement 8

**User Story:** As a developer, I want to migrate real-time subscriptions to Supabase Realtime, so that live features continue to work after migration.

#### Acceptance Criteria

1. WHEN migrating subscriptions THEN the Supabase database SHALL enable Realtime for tables requiring live updates
2. WHEN migrating subscriptions THEN the Fish Art System SHALL replace Hasura subscription code with Supabase Realtime listeners
3. WHEN Realtime is configured THEN the Fish Art System SHALL maintain the same real-time update behavior for the community tank

### Requirement 9

**User Story:** As a developer, I want comprehensive testing of the migrated system, so that I can ensure all features work correctly after migration.

#### Acceptance Criteria

1. WHEN testing the migration THEN the Fish Art System SHALL pass all existing unit tests with the Supabase backend
2. WHEN testing the migration THEN the Fish Art System SHALL verify CRUD operations for all major entities (fish, users, votes, messages)
3. WHEN testing the migration THEN the Fish Art System SHALL verify payment and subscription workflows function correctly
4. WHEN testing the migration THEN the Fish Art System SHALL verify authentication flows work with the unified Supabase auth
