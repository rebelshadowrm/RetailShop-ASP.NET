# ASP-Group-Project  

## Local configuration

This repository no longer stores database credentials or a default admin password.

Provide the required values through `.NET user-secrets`, environment variables, or a local `appsettings.Local.json` file that is not committed.

## Local demo mode

The project targets .NET 10 and can run locally without the old AWS/Azure SQL Server databases.

Install the .NET 10 SDK, then run:

```powershell
dotnet restore
dotnet build
dotnet run
```

In `Development`, demo mode is enabled by default and uses SQLite files under `App_Data/`. These files are local runtime data and are ignored by git.

Demo credentials are intentionally non-production:

- Admin: `demo.admin@example.com` / `DemoAdmin123!`
- Customer: `demo.customer@example.com` / `DemoCustomer123!`

To use SQL Server instead, set `DemoMode` to `false` in `appsettings.Local.json` or environment variables, then provide the required connection strings.

Product images are committed under `wwwroot/img/shop` and are loaded locally from `wwwroot/js/storeData.json`. The app no longer depends on the old S3 product image bucket. PNG files are intentionally kept as the canonical assets for now; WebP/AVIF conversion is deferred until after deployment is stable.

## Heroku deployment prep

Heroku deployment is prepared for the official `.NET` buildpack and Heroku Postgres. Docker is intentionally not part of this phase.

Required Heroku setup:

```powershell
heroku buildpacks:set heroku/dotnet -a <app-name>
heroku addons:create heroku-postgresql:essential-0 -a <app-name>
heroku config:set ASPNETCORE_ENVIRONMENT=Production DemoMode=false DatabaseProvider=Postgres -a <app-name>
```

Heroku Postgres provides `DATABASE_URL`. In `DatabaseProvider=Postgres` mode, the app parses that value and uses SSL-required Npgsql connections for Identity, comments, and order history.

The first Heroku deployment expects an empty Heroku Postgres database. The app creates the ASP.NET Identity schema only when the database is empty, then creates the comments and order-history tables with idempotent Postgres SQL. If the database is not empty but Identity tables are missing, startup fails with a clear error instead of guessing.

SQLite demo data under `App_Data/` is local-only and ignored by git.

### Required connection strings

- `ConnectionStrings:AmazonSqlConnection`
- `ConnectionStrings:CommentDb`
- `ConnectionStrings:OrderHistoryDb`

### Optional admin bootstrap

If you want the app to create an admin user on startup, set both:

- `SeedAdmin:Email`
- `SeedAdmin:Password`

Example with user-secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:AmazonSqlConnection" "<identity-db-connection-string>"
dotnet user-secrets set "ConnectionStrings:CommentDb" "<comments-db-connection-string>"
dotnet user-secrets set "ConnectionStrings:OrderHistoryDb" "<order-history-db-connection-string>"
dotnet user-secrets set "SeedAdmin:Email" "admin@example.com"
dotnet user-secrets set "SeedAdmin:Password" "<strong-password>"
```

~~website: https://asp-group-project20211123101749.azurewebsites.net~~  
Project is now moving from azure to aws.  
  
~~website: http://asp-g-recip-12kr0dfui2w59-814129720.us-east-2.elb.amazonaws.com~~  
For some reason identity (login/register) doesn't work with previous docker build.
  
~~Website: http://aspgroupproject-dev.us-east-2.elasticbeanstalk.com~~    
~~Newest up to date website link: http://asp-project.group~~  
Project has ended. All sites are down
# Members  
Alex Basine -------- rebelshadowrm  
Jackson Smith ------- jrsmith-6246  
Jackson Beaudette ------  ChooeyJr  
David Nguyen ------------ DavidN3  


