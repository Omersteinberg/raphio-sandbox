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

  const baseClasses = `bg-white border-gray-200 ${className || ""}`;
  const clickableClasses = clickable ?
    "cursor-pointer hover:shadow-lg hover:border-purple-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-out" :
    "";

  const cardContent = (
    <Card className={`${baseClasses} ${clickableClasses}`} style={sizeStyle}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-600">{description}</CardDescription>
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
