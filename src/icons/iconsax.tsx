import type { ComponentType, SVGAttributes } from 'react';
import {
  Add,
  Archive as AxArchive,
  ArchiveBox,
  ArrowDown as AxArrowDown,
  ArrowDown2,
  ArrowLeft as AxArrowLeft,
  ArrowLeft2,
  ArrowRight as AxArrowRight,
  ArrowRight2,
  ArrowRotateLeft,
  ArrowUp2,
  Briefcase,
  Building,
  Copy as AxCopy,
  DocumentDownload,
  DocumentText,
  DocumentUpload,
  Edit2,
  Element,
  ExportCurve,
  Eye as AxEye,
  EyeSlash,
  GalleryAdd,
  Global,
  HambergerMenu,
  Home as AxHome,
  Image as AxImage,
  InfoCircle,
  Judge,
  Key,
  Layer,
  Location,
  Lock as AxLock,
  Login,
  Logout,
  Magicpen,
  Map1,
  Maximize2 as AxMaximize2,
  Menu as AxMenu,
  Message,
  Minus as AxMinus,
  Mobile,
  Monitor as AxMonitor,
  More,
  PenTool2,
  People,
  Refresh2,
  RotateLeft,
  SearchNormal,
  Send as AxSend,
  Setting,
  Sms,
  Sort,
  Star1,
  Task,
  Text,
  TextBold,
  TextItalic,
  TickCircle,
  Trash,
  Tree,
  Unlock as AxUnlock,
  User,
  type Icon,
} from 'iconsax-react';

type AxProps = SVGAttributes<SVGElement> & {
  size?: number | string;
  strokeWidth?: number;
  color?: string;
};

export type LucideIcon = ComponentType<AxProps>;

function ax(IconComp: Icon, spin = false): LucideIcon {
  return function IconsaxIcon({
    size = 20,
    strokeWidth: _stroke,
    color = 'currentColor',
    className,
    ...rest
  }: AxProps) {
    return (
      <IconComp
        size={size}
        color={color}
        variant="Linear"
        className={spin ? ['gh-ax-spin', className].filter(Boolean).join(' ') : className}
        {...rest}
      />
    );
  };
}

/** Thin close, drawn in the same linear weight as Iconsax. */
export function X({ size = 20, className, color = 'currentColor', strokeWidth = 1.5, ...rest }: AxProps) {
  const s = typeof size === 'number' ? size : Number(size) || 20;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} aria-hidden {...rest}>
      <path d="M7 7l10 10M17 7L7 17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export const ArrowRight = ax(AxArrowRight);
export const ArrowLeft = ax(AxArrowLeft);
export const ArrowUpRight = ax(ExportCurve);
export const ArrowDown = ax(AxArrowDown);
export const ArrowDownWideNarrow = ax(Sort);
export const ChevronLeft = ax(ArrowLeft2);
export const ChevronRight = ax(ArrowRight2);
export const ChevronDown = ax(ArrowDown2);
export const ChevronUp = ax(ArrowUp2);
export const Menu = ax(AxMenu);
export const Plus = ax(Add);
export const Check = ax(TickCircle);
export const Search = ax(SearchNormal);
export const Lock = ax(AxLock);
export const Unlock = ax(AxUnlock);
export const Eye = ax(AxEye);
export const EyeOff = ax(EyeSlash);
export const Loader2 = ax(Refresh2, true);
export const Loader = ax(Refresh2, true);
export const MapPin = ax(Location);
export const MapPinned = ax(Location);
export const Globe = ax(Global);
export const Home = ax(AxHome);
export const Map = ax(Map1);
export const Leaf = ax(Tree);
export const MessageCircle = ax(Message);
export const Signature = ax(PenTool2);
export const Download = ax(DocumentDownload);
export const Maximize2 = ax(AxMaximize2);
export const Building2 = ax(Building);
export const LandPlot = ax(Map1);
export const Layers = ax(Layer);
export const Scale = ax(Judge);
export const BriefcaseBusiness = ax(Briefcase);
export const Focus = ax(SearchNormal);
export const DoorOpen = ax(Login);
export const UserRound = ax(User);
export const Sparkles = ax(Magicpen);
export const Archive = ax(AxArchive);
export const ArchiveRestore = ax(ArchiveBox);
export const RotateCcw = ax(RotateLeft);
export const Send = ax(AxSend);
export const ImagePlus = ax(GalleryAdd);
export const ImageIcon = ax(AxImage);
export const Trash2 = ax(Trash);
export const Undo2 = ax(ArrowRotateLeft);
export const AlertCircle = ax(InfoCircle);
export const Star = ax(Star1);
export const KeyRound = ax(Key);
export const Pencil = ax(Edit2);
export const FileText = ax(DocumentText);
export const FileUp = ax(DocumentUpload);
export const Mail = ax(Sms);
export const Monitor = ax(AxMonitor);
export const Smartphone = ax(Mobile);
export const GripVertical = ax(HambergerMenu);
export const RefreshCw = ax(Refresh2);
export const Copy = ax(AxCopy);
export const MoreHorizontal = ax(More);
export const LayoutGrid = ax(Element);
export const LogOut = ax(Logout);
export const PanelLeftClose = ax(ArrowLeft2);
export const PanelLeftOpen = ax(ArrowRight2);
export const Settings2 = ax(Setting);
export const UsersRound = ax(People);
export const Heading2 = ax(Text);
export const Heading3 = ax(TextItalic);
export const Bold = ax(TextBold);
export const Italic = ax(TextItalic);
export const List = ax(Task);
export const ListOrdered = ax(Task);
export const Minus = ax(AxMinus);
