import { redirect } from "next/navigation";

/** Customer profile hub removed — shop without an account area. */
export default function AccountIndexPage() {
  redirect("/");
}
