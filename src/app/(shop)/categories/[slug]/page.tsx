import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Category product grids live on /shop?category=… */
export default async function CategorySlugRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/shop?category=${encodeURIComponent(slug)}`);
}
