import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function createCategoryAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  requireAdmin(user);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  let slug = slugify(name) || "category";
  let n = 0;
  while (await prisma.category.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(name)}-${n}`;
  }
  await prisma.category.create({
    data: {
      name,
      slug,
      description: String(formData.get("description") || "") || null,
    },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/shop");
  revalidatePath("/");
}

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl">Categories</h1>
          <Button asChild href="/categories" variant="outline" size="sm">
            View public page
          </Button>
        </div>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <span className="font-semibold">{c.name}</span>
                <span className="ml-2 text-[var(--color-text-muted)]">
                  /{c.slug}
                </span>
                {!c.isActive ? (
                  <span className="ml-2 text-[var(--color-warning)]">
                    inactive
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
                <span>
                  {c._count.products} product
                  {c._count.products === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/categories/${c.slug}`}
                  className="font-semibold text-[var(--color-primary)] underline"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
          {categories.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              None yet. Add a category so shoppers can browse by kind.
            </p>
          ) : null}
        </ul>
      </div>
      <form action={createCategoryAction} className="card h-fit space-y-3 p-6">
        <h2 className="font-semibold">Add category</h2>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" />
        </div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  );
}
