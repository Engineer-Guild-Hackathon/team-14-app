# CodeClimb Docker Management
.PHONY: help build up up-dev down logs clean migrate seed shell db-shell

# デフォルトターゲット
help:
	@echo "CodeClimb Docker Commands:"
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start production environment"
	@echo "  make up-dev     - Start development environment"
	@echo "  make down       - Stop all containers"
	@echo "  make logs       - Show logs from all services"
	@echo "  make migrate    - Run database migrations"
	@echo "  make seed       - Seed database with sample data"
	@echo "  make shell      - Open shell in backend container"
	@echo "  make db-shell   - Open PostgreSQL shell"
	@echo "  make clean      - Remove all containers and volumes (DESTRUCTIVE)"

# 本番環境の構築・起動
build:
	docker-compose build

up:
	docker-compose --env-file .env.docker up -d
	@echo "✅ CodeClimb backend is running at http://localhost:3000"

# 開発環境の起動
up-dev:
	docker-compose -f docker-compose.dev.yml --env-file .env.docker up -d
	@echo "✅ CodeClimb development backend is running at http://localhost:3000"

# 停止
down:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# ログ表示
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f db

# データベースマイグレーション
migrate:
	docker-compose exec backend npx prisma migrate deploy

# データベースシード
seed:
	docker-compose exec backend npx prisma db seed

# シェルアクセス
shell:
	docker-compose exec backend sh

db-shell:
	docker-compose exec db psql -U codeclimb_user -d codeclimb

# クリーンアップ（注意：データが削除されます）
clean:
	@echo "⚠️  This will remove all containers and volumes. Are you sure? [y/N]" && read ans && [ $${ans:-N} = y ]
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f

# 健康チェック
health:
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Backend health:"
	@curl -f http://localhost:3000/health 2>/dev/null && echo "✅ Backend is healthy" || echo "❌ Backend is not responding"