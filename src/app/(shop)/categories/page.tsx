import { redirect } from "next/navigation";

/** Categories browse removed — Shop already filters by category. */
export default function CategoriesIndexRedirect() {
  redirect("/shop");
}
