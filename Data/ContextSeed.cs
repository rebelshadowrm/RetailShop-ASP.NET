using Microsoft.AspNetCore.Identity;

namespace Asp_Group_Project.Data
{
    public static class ContextSeed
    {
        public static async Task SeedRolesAsync(UserManager<IdentityUser> userManager, RoleManager<IdentityRole> roleManager)
        {
            //Seed Roles
            foreach (var roleName in Enum.GetNames(typeof(Enums.Roles)))
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole(roleName));
                }
            }
        }

        public static async Task SeedAdminAsync(
            UserManager<IdentityUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration configuration)
        {
            var adminEmail = configuration["SeedAdmin:Email"];
            var adminPassword = configuration["SeedAdmin:Password"];

            if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
            {
                return;
            }

            // Seed an admin user only when explicit local or deployment secrets are provided.
            var defaultUser = new IdentityUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                PhoneNumberConfirmed = true
            };

            var user = await userManager.FindByEmailAsync(defaultUser.Email);
            if (user == null)
            {
                var createResult = await userManager.CreateAsync(defaultUser, adminPassword);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join("; ", createResult.Errors.Select(error => error.Description));
                    throw new InvalidOperationException($"Failed to create seeded admin user: {errors}");
                }

                user = defaultUser;
            }

            if (!await userManager.IsInRoleAsync(user, Enums.Roles.Admin.ToString()))
            {
                await userManager.AddToRoleAsync(user, Enums.Roles.Admin.ToString());
            }
        }
    }
}


