import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { slugify } from "@/lib/slug";
import { revalidatePath } from "next/cache";
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
    data: { name, slug, description: String(formData.get("description") || "") || null },
  });
  revalidatePath("/admin/categories");
}

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <h1
          className="mb-4 text-3xl"
        >
          Categories
        </h1>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="card px-4 py-3 text-sm">
              <span className="font-semibold">{c.name}</span>
              <span className="ml-2 text-[var(--color-text-muted)]">/{c.slug}</span>
            </li>
          ))}
          {categories.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">None yet.</p>
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
