interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}

export function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <Icon size={18} className="section-header__icon" />
      <h2 className="section-header__title">{title}</h2>
      {subtitle && <span className="section-header__sub">{subtitle}</span>}
    </div>
  );
}
