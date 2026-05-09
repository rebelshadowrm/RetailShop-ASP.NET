using Microsoft.EntityFrameworkCore;

namespace Asp_Group_Project.Data
{
    public class CommentContext : DbContext
    {
        public CommentContext(DbContextOptions<CommentContext> options) : base(options)
        {

        }

        public DbSet<Comment> Comments { get; set; }
    }

    public class Comment
    {
        public int Id { get; set; }
        public int productId { get; set; }
        public int? Rating { get; set; }
        public string? Title { get; set; }
        public string? Author { get; set; }
        public string? Body { get; set; }
    }
    
}
