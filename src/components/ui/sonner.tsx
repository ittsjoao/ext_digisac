import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon style={{ width: 16, height: 16, flexShrink: 0 }} />,
        info: <InfoIcon style={{ width: 16, height: 16, flexShrink: 0 }} />,
        warning: <TriangleAlertIcon style={{ width: 16, height: 16, flexShrink: 0 }} />,
        error: <OctagonXIcon style={{ width: 16, height: 16, flexShrink: 0 }} />,
        loading: <Loader2Icon style={{ width: 16, height: 16, flexShrink: 0, animation: "spin 1s linear infinite" }} />,
      }}
      {...props}
    />
  )
}

export { Toaster }
