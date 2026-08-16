import React from "react";
import {
  Heart,
  ShieldAlert,
  MessageSquare,
  Crown,
  Brain,
  TrendingUp,
  Briefcase,
  LineChart,
  AlertTriangle,
  Target,
  Handshake,
  Building2,
  HeartHandshake,
  Shield,
  Compass,
  Crosshair,
  BarChart3,
  Users,
  DollarSign,
  Flame,
  BookOpen,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

export const categoryIconMap: Record<string, LucideIcon> = {
  female_selfworth: Heart,
  avoid_creeps_awareness: ShieldAlert,
  communication: MessageSquare,
  office_politics: Crown,
  personality: Brain,
  corporate_ladder_real_strategy: TrendingUp,
  corporate_ladder_mastery: TrendingUp,
  interview: Briefcase,
  investing_awareness_mastery: LineChart,
  corporate_dangers_awareness: AlertTriangle,
  leadership: Target,
  negotiation: Handshake,
  solid_relation_with_boss: Building2,
  attraction: HeartHandshake,
  masculine_character: Shield,
  chanakya_corporate: Compass,
  machiavelli: Crosshair,
  stocks: BarChart3,
  parenting: Users,
  parenting_teen_boys_focused_full: Users,
  digital_age_teen_parenting_full: Users,
  parenting_teen_girls_focused_full: Users,
  workplace_relations_mastery: Users,
  friendly_workplace_mastery: Users,
  strong_team_bonding: Users,
  finance: DollarSign,
  rizz: Flame,
};

export function getCategoryIcon(categoryId?: string): LucideIcon {
  if (!categoryId) return BookOpen;
  return categoryIconMap[categoryId] || BookOpen;
}

export interface CategoryIconProps extends LucideProps {
  categoryId?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  categoryId,
  className = "h-4 w-4",
  ...props
}) => {
  const IconComponent = getCategoryIcon(categoryId);
  return <IconComponent className={className} {...props} />;
};

export default CategoryIcon;
