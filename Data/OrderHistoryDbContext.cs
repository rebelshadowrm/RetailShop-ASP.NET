using Microsoft.EntityFrameworkCore;

namespace Asp_Group_Project.Data
{
    public class OrderHistoryContext : DbContext
    {
        public OrderHistoryContext(DbContextOptions<OrderHistoryContext> options) : base(options)
        {

        }
        public DbSet<Order> OrderHistory { get; set; }

    }
    public class Order
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public string Address { get; set; }
        public DateTime Date { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }

    }   
}
