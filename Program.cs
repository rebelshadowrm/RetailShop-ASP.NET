using Asp_Group_Project.Data;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

var demoMode = builder.Configuration.GetValue<bool>("DemoMode");
var databaseProvider = GetDatabaseProvider(builder.Configuration, demoMode);

// Add services to the container.
ConfigureDbContext<ApplicationDbContext>(builder.Services, builder.Configuration, databaseProvider, "AmazonSqlConnection");
builder.Services.AddDatabaseDeveloperPageExceptionFilter();

builder.Services.AddDefaultIdentity<IdentityUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();
builder.Services.AddControllersWithViews();

ConfigureDbContext<CommentContext>(builder.Services, builder.Configuration, databaseProvider, "CommentDb");
ConfigureDbContext<OrderHistoryContext>(builder.Services, builder.Configuration, databaseProvider, "OrderHistoryDb");
var app = builder.Build();

var host = app.Services.GetRequiredService<IServiceProvider>();
using (var scope = host.CreateScope())
{
    var services = scope.ServiceProvider;
    var loggerFactory = services.GetRequiredService<ILoggerFactory>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var commentContext = services.GetRequiredService<CommentContext>();
        var orderHistoryContext = services.GetRequiredService<OrderHistoryContext>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        await DatabaseInitializer.EnsureDatabasesAsync(
            context,
            commentContext,
            orderHistoryContext,
            databaseProvider);

        await ContextSeed.SeedRolesAsync(userManager, roleManager);
        await ContextSeed.SeedUsersAsync(userManager, roleManager, builder.Configuration);
    }
    catch (Exception ex)
    {
        var logger = loggerFactory.CreateLogger<Program>();
        logger.LogError(ex, "An error occurred seeding the DB.");
    }
}

app.MapGet("/api/comments", async (CommentContext db) => await db.Comments.ToListAsync());

app.MapGet("/api/comments/{id}", async (CommentContext db, int id) => await db.Comments.FindAsync(id));

app.MapPost("/api/comments", async (CommentContext db, Comment comment) =>
{
    await db.Comments.AddAsync(comment);
    await db.SaveChangesAsync();
    return Results.Created($"/api/comments/{comment.Id}", comment);
});

app.MapPut("/api/comments/{id}", async (CommentContext db, int id, Comment comment) =>
{
    if (id != comment.Id) return Results.BadRequest();

    db.Update(comment);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

app.MapDelete("/api/comments/{id}", async (CommentContext db, int id) =>
{
    var comment = await db.Comments.FindAsync(id);
    if (comment == null) return Results.NotFound();

    db.Comments.Remove(comment);
    await db.SaveChangesAsync();

    return Results.NoContent();
});


app.MapGet("/api/orders", async (OrderHistoryContext db) => await db.OrderHistory.ToListAsync());

app.MapGet("/api/orders/{username}", async (OrderHistoryContext db, string username) => await db.OrderHistory.Where(x => x.Username == username).ToListAsync());

app.MapPost("/api/orders", async (OrderHistoryContext db, List<Order> orders) =>
{
    orders.ForEach(async delegate (Order order)
    {
        await db.OrderHistory.AddAsync(order);
    });
    await db.SaveChangesAsync();
    return Results.Created($"orders{orders}", orders);
});


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
}
else
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapRazorPages();



app.Run();

static void ConfigureDbContext<TContext>(
    IServiceCollection services,
    IConfiguration configuration,
    DatabaseProvider databaseProvider,
    string connectionStringName) where TContext : DbContext
{
    services.AddDbContext<TContext>(options =>
    {
        if (databaseProvider == DatabaseProvider.Sqlite)
        {
            var connectionString = GetRequiredConnectionString(configuration, connectionStringName);
            EnsureSqliteDirectory(connectionString);
            options.UseSqlite(connectionString);
            return;
        }

        if (databaseProvider == DatabaseProvider.Postgres)
        {
            options.UseNpgsql(GetRequiredPostgresConnectionString(configuration));
            return;
        }

        options.UseSqlServer(GetRequiredConnectionString(configuration, connectionStringName));
    });
}

static void EnsureSqliteDirectory(string connectionString)
{
    var builder = new SqliteConnectionStringBuilder(connectionString);
    if (string.IsNullOrWhiteSpace(builder.DataSource) || builder.DataSource == ":memory:")
    {
        return;
    }

    var directory = Path.GetDirectoryName(Path.GetFullPath(builder.DataSource));
    if (!string.IsNullOrWhiteSpace(directory))
    {
        Directory.CreateDirectory(directory);
    }
}

static DatabaseProvider GetDatabaseProvider(IConfiguration configuration, bool demoMode)
{
    if (demoMode)
    {
        return DatabaseProvider.Sqlite;
    }

    var value = configuration["DatabaseProvider"];
    if (string.IsNullOrWhiteSpace(value))
    {
        return DatabaseProvider.SqlServer;
    }

    if (Enum.TryParse<DatabaseProvider>(value, ignoreCase: true, out var databaseProvider))
    {
        return databaseProvider;
    }

    throw new InvalidOperationException(
        $"Unsupported DatabaseProvider '{value}'. Use SqlServer, Postgres, or Sqlite.");
}

static string GetRequiredPostgresConnectionString(IConfiguration configuration)
{
    var databaseUrl = configuration["DATABASE_URL"];
    if (string.IsNullOrWhiteSpace(databaseUrl))
    {
        throw new InvalidOperationException(
            "Missing DATABASE_URL. Heroku Postgres provides this config var when the add-on is attached.");
    }

    var databaseUri = new Uri(databaseUrl);
    var userInfo = databaseUri.UserInfo.Split(':', 2);
    if (userInfo.Length != 2)
    {
        throw new InvalidOperationException("DATABASE_URL must include PostgreSQL username and password.");
    }

    return new NpgsqlConnectionStringBuilder
    {
        Host = databaseUri.Host,
        Port = databaseUri.Port > 0 ? databaseUri.Port : 5432,
        Database = databaseUri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = Uri.UnescapeDataString(userInfo[1]),
        SslMode = SslMode.Require
    }.ConnectionString;
}

static string GetRequiredConnectionString(IConfiguration configuration, string name)
{
    var connectionString = configuration.GetConnectionString(name);
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        return connectionString;
    }

    throw new InvalidOperationException(
        $"Missing connection string '{name}'. Configure it via user secrets, environment variables, or appsettings.Local.json.");
}
