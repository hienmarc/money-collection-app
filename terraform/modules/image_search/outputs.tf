output "api_url" {
  value = aws_apigatewayv2_api.image_search.api_endpoint
}

output "bucket_name" {
  value = aws_s3_bucket.images.bucket
}

output "table_name" {
  value = aws_dynamodb_table.jobs.name
}
