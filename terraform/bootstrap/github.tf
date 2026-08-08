resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "github_actions" {
  name               = "money-collection-app-github-actions"
  assume_role_policy = data.aws_iam_policy_document.trust.json
}

data "aws_iam_policy_document" "apply_pipeline_permissions" {
  statement {
    sid    = "ManageProjectBuckets"
    effect = "Allow"
    actions = [
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:List*",
      "s3:Get*",
      "s3:DeleteBucketPolicy",
      "s3:PutObject",
      "s3:PutEncryptionConfiguration",
      "s3:PutBucketAcl",
      "s3:PutBucketTagging",
      "s3:PutBucketVersioning",
      "s3:PutLifecycleConfiguration",
      "s3:PutBucketPublicAccessBlock",
      "s3:PutBucketPolicy",
    ]
    resources = [
      "arn:aws:s3:::${var.aws_resource_prefix}-*",
    ]
  }

  statement {
    sid    = "ManageProjectRole"
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:Get*",
      "iam:List*",
      "iam:UpdateAssumeRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:PutRolePolicy",
      "iam:TagRole"
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.aws_resource_prefix}-*",
    ]
  }

  statement {
    effect = "Allow"
    sid    = "ReadOidcProvider"
    actions = [
      "iam:ListOpenIDConnectProviders",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "GetOidcProvider"
    effect = "Allow"
    actions = [
      "iam:GetOpenIDConnectProvider",
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com",
    ]
  }
}

resource "aws_iam_role_policy" "apply_pipeline_permissions" {
  name   = "${var.aws_resource_prefix}-apply-pipeline-permissions"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.apply_pipeline_permissions.json
}
