import blogPosts from "@/content/blogPosts.json";

export type BlogPost = (typeof blogPosts)[number] & {
  path: string;
};

export const blogEntries: BlogPost[] = blogPosts.map((post) => ({
  ...post,
  path: `/blog/${post.slug}`,
}));

export function getBlogPostBySlug(slug?: string) {
  return blogEntries.find((post) => post.slug === slug);
}
