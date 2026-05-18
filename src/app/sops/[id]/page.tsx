import { SopDetail } from "@/components/sop/sop-detail";

export default async function SopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SopDetail id={Number(id)} />;
}
