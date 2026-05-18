import { SopForm } from "@/components/sop/sop-form";

export default async function EditSopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SopForm mode="edit" sopId={Number(id)} />;
}
