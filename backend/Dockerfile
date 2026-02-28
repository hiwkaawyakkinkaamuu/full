FROM golang:1.25.5-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o main ./main.go

# Use a minimal image for running
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main ./main
COPY --from=builder /app/config ./config
COPY --from=builder /app/migration ./migration
COPY --from=builder /app/uploads ./uploads
EXPOSE 8080
CMD ["./main"]
