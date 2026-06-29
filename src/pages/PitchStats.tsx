import { Navigate, useParams } from "react-router-dom";
import NotFound from "./NotFound";
import { categorySeoEntries } from "@/lib/categorySeo";

const PitchStats = () => {
  const { title } = useParams<{ title: string }>();

  const category = categorySeoEntries.find(
    (entry) => entry.id === title || entry.slug === title
  );

  if (!category) {
    return <NotFound />;
  }

  return <Navigate to={category.path} replace />;
};

export default PitchStats;
