type HeptaCertLogoMarkProps = {
  className?: string;
  imageClassName?: string;
};

export default function HeptaCertLogoMark({
  className = "h-8 w-8",
  imageClassName = "",
}: HeptaCertLogoMarkProps) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <img
        src="/favicon.svg"
        alt="HeptaCert"
        className={`h-full w-full object-contain ${imageClassName}`}
      />
    </span>
  );
}
