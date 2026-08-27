export function RoleBadge({ name }: { name: string }) {
  return (
    <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent-dark">{name}</span>
  );
}
