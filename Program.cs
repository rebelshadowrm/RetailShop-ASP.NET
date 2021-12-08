using Asp_Group_Project.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
var connectionString = builder.Configuration.GetConnectionString("AmazonSqlConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));
builder.Services.AddDatabaseDeveloperPageExceptionFilter();

builder.Services.AddDefaultIdentity<IdentityUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<ApplicationDbContext>();
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<CommentContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("CommentDb")));
builder.Services.AddDbContext<OrderHistoryContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("OrderHistoryDb")));
var app = builder.Build();

var host = app.Services.GetRequiredService<IServiceProvider>();
using (var scope = host.CreateScope())
{
    var services = scope.ServiceProvider;
    var loggerFactory = services.GetRequiredService<ILoggerFactory>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        await ContextSeed.SeedRolesAsync(userManager, roleManager);
        await ContextSeed.SeedAdminAsync(userManager, roleManager);
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
