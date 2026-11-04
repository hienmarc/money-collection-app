output "bucket_name" {
  value = aws_s3_bucket.images.bucket
}

output "table_name" {
  value = aws_dynamodb_table.jobs.name
}
