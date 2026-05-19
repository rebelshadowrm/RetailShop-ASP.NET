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

        public static async Task SeedUsersAsync(
            UserManager<IdentityUser> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration configuration)
        {
            await SeedUserAsync(
                userManager,
                roleManager,
                configuration["SeedUsers:Admin:Email"] ?? configuration["SeedAdmin:Email"],
                configuration["SeedUsers:Admin:Password"] ?? configuration["SeedAdmin:Password"],
                Enums.Roles.Admin.ToString());

            await SeedUserAsync(
                userManager,
                roleManager,
                configuration["SeedUsers:Customer:Email"],
                configuration["SeedUsers:Customer:Password"],
                Enums.Roles.Customer.ToString());
        }

        private static async Task SeedUserAsync(
            UserManager<IdentityUser> userManager,
            RoleManager<IdentityRole> roleManager,
            string? email,
            string? password,
            string roleName)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                return;
            }

            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }

            // Demo users are seeded only from explicit local/demo configuration.
            var defaultUser = new IdentityUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                PhoneNumberConfirmed = true
            };

            var user = await userManager.FindByEmailAsync(defaultUser.Email);
            if (user == null)
            {
                var createResult = await userManager.CreateAsync(defaultUser, password);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join("; ", createResult.Errors.Select(error => error.Description));
                    throw new InvalidOperationException($"Failed to create seeded {roleName} user: {errors}");
                }

                user = defaultUser;
            }

            if (!await userManager.IsInRoleAsync(user, roleName))
            {
                await userManager.AddToRoleAsync(user, roleName);
            }
        }
    }
}


