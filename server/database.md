## Diagram

```mermaid
erDiagram

    app_user_repo_subscriptions {
        id uuid PK "not null"
        app_user_id uuid FK "not null"
        repo_id uuid FK "not null"
        app_user_id uuid "not null"
        repo_id uuid "not null"
        has_updated boolean "null"
        last_release timestamp_with_time_zone "null"
    }

    app_users {
        id uuid PK "not null"
        access_key text "null"
        email text "null"
        github_avatar text "null"
        github_displayname text "null"
        github_username text "null"
    }

    github_releases {
        id uuid PK "not null"
        repo_id uuid FK "not null"
        prerelease boolean "not null"
        github_id integer "not null"
        body text "not null"
        name text "not null"
        tag_name text "not null"
        url text "not null"
        release_created_at timestamp_with_time_zone "not null"
        repo_id uuid "not null"
        created_at timestamp_with_time_zone "null"
        last_updated timestamp_with_time_zone "null"
    }

    repos {
        id uuid PK "not null"
        github_id integer "not null"
        owner text "not null"
        repo_name text "not null"
        created_at timestamp_with_time_zone "null"
        last_release_check timestamp_with_time_zone "null"
        last_updated timestamp_with_time_zone "null"
    }

    app_users ||--o{ app_user_repo_subscriptions : "app_user_repo_subscriptions(app_user_id) -> app_users(id)"
    repos ||--o{ app_user_repo_subscriptions : "app_user_repo_subscriptions(repo_id) -> repos(id)"
    repos ||--o{ github_releases : "github_releases(repo_id) -> repos(id)"
```

## Indexes

### `app_user_repo_subscriptions`

- `app_user_repo_subscriptions_pkey`
- `app_user_repo_subscriptions_unique_user_repo`

### `app_users`

- `app_users_github_username_key`
- `app_users_pkey`

### `github_releases`

- `github_releases_pkey`
- `github_releases_tag_repo_key`
- `idx_github_releases_repo_id`

### `repos`

- `idx_repos_owner_repo_name`
- `repos_github_id_key`
- `repos_pkey`
- `repos_unique_owner_repo`
