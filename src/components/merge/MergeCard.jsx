import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

const MergeCard = ({ 
  title, 
  description, 
  icon,
  size = null,
  clickable = false,
  onClick,
  href,
  className 
}) => {
  const sizeStyle = {
    width: size
  };

  const baseClasses = className;
  const clickableClasses = clickable ? 
    "cursor-pointer hover:shadow-[0_20px_50px_hsl(var(--primary)_/_0.1)] hover:border-primary hover:scale-[1.05] active:scale-[0.98] transition-all duration-200 ease-out hover:ease-in-out" : 
    "";

  const cardContent = (
    <Card className={`${baseClasses} ${clickableClasses}`} style={sizeStyle}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {cardContent}
      </a>
    );
  }

  if (onClick) {
    return (
      <div onClick={onClick}>
        {cardContent}
      </div>
    );
  }

  return cardContent;
};

export default MergeCard;