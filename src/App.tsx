import { Navigate, Route, Routes, useParams } from "react-router-dom";

import { CategoryManager } from "@/components/sop/category-manager";
import { DashboardHome } from "@/components/sop/dashboard-home";
import { InventoryLibrary } from "@/components/sop/inventory-library";
import { LoginForm } from "@/components/sop/login-form";
import { PublicLibrary } from "@/components/sop/public-library";
import { SopDetail } from "@/components/sop/sop-detail";
import { SopForm } from "@/components/sop/sop-form";
import { UserManager } from "@/components/sop/user-manager";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLibrary />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/sops/all" element={<InventoryLibrary />} />
      <Route path="/sops/:id" element={<SopDetailRoute />} />
      <Route path="/dashboard" element={<DashboardHome />} />
      <Route path="/dashboard/categories" element={<CategoryManager />} />
      <Route path="/dashboard/users" element={<UserManager />} />
      <Route path="/dashboard/sops/new" element={<SopForm mode="create" />} />
      <Route path="/dashboard/sops/:id/edit" element={<EditSopRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function SopDetailRoute() {
  const { id } = useParams();
  return <SopDetail id={Number(id)} />;
}

function EditSopRoute() {
  const { id } = useParams();
  return <SopForm mode="edit" sopId={Number(id)} />;
}
