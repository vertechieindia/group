import { redirect } from "next/navigation";

export default function CompanyHomePage({ params }: { params: { company: string } }) {
  redirect(`/${params.company}/timesheets`);
}
