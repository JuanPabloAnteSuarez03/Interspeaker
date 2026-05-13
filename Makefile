.PHONY: help build up up-dev down restart logs clean rebuild ps shell-backend shell-frontend dev

help: ## Muestra este mensaje de ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Construir las imagenes Docker
	docker-compose build

up: ## Levantar servicios (produccion)
	docker-compose up -d
	@echo "Frontend: http://localhost:3100"
	@echo "Backend:  http://localhost:5100"

up-dev: ## Levantar servicios en modo desarrollo (hot-reload)
	docker-compose -f docker-compose.dev.yml up

down: ## Detener los servicios
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

restart: down up ## Reiniciar los servicios

logs: ## Ver logs de todos los servicios
	docker-compose logs -f

logs-backend: ## Ver logs del backend
	docker-compose logs -f backend

logs-frontend: ## Ver logs del frontend
	docker-compose logs -f frontend

clean: ## Detener y eliminar contenedores, imagenes y volumenes
	docker-compose down -v
	docker system prune -f

rebuild: ## Reconstruir y reiniciar todo
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

ps: ## Ver estado de los contenedores
	docker-compose ps

shell-backend: ## Abrir shell en el contenedor del backend
	docker exec -it interspeaker-backend bash

shell-frontend: ## Abrir shell en el contenedor del frontend
	docker exec -it interspeaker-frontend sh

dev: ## Modo desarrollo local (sin Docker)
	@echo "Backend:  cd Backend && flask run"
	@echo "Frontend: cd Frontend && npm run dev"
