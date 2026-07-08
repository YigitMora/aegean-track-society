export const atsImages = {
  hero: "/images/ats/hero-fl5.jpg",
  community: "/images/ats/community-n-line.jpg",
  experienceRear: "/images/ats/experience-fl5-rear.jpg",
  gallery01: "/images/ats/gallery-01.jpg",
  gallery02: "/images/ats/gallery-02.jpg",
  gallery03: "/images/ats/gallery-03.jpg",
} as const;

export const atsImageSlots = [
  {
    key: "hero",
    src: atsImages.hero,
    label: "Hero track action",
  },
  {
    key: "community",
    src: atsImages.community,
    label: "Paddock community",
  },
  {
    key: "experienceRear",
    src: atsImages.experienceRear,
    label: "Driver experience detail",
  },
  {
    key: "gallery01",
    src: atsImages.gallery01,
    label: "Gallery image 01",
  },
  {
    key: "gallery02",
    src: atsImages.gallery02,
    label: "Gallery image 02",
  },
  {
    key: "gallery03",
    src: atsImages.gallery03,
    label: "Gallery image 03",
  },
] as const;
