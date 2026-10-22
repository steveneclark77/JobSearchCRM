FROM node:24-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM maven:3.9.11-eclipse-temurin-21 AS backend
WORKDIR /src/backend
COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /src/frontend/dist /src/frontend/dist
RUN mvn -B package
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S crm && adduser -S crm -G crm && mkdir -p /app/data && chown crm:crm /app/data
WORKDIR /app
COPY --from=backend /src/backend/target/jobcrm-0.1.0.jar app.jar
USER crm
ENV BIND_ADDRESS=0.0.0.0
EXPOSE 8080
VOLUME ["/app/data"]
ENTRYPOINT ["java","-jar","app.jar"]
