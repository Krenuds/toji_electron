import React from 'react'
import { Image, ImageProps } from '@chakra-ui/react'
import tojiLogo from '../assets/toji-logo.png'

interface TojiLogoProps extends Omit<ImageProps, 'src' | 'alt'> {
  size?: string | number
}

export function TojiLogo({ size = '32px', ...props }: TojiLogoProps): React.JSX.Element {
  return <Image src={tojiLogo} alt="Toji" width={size} height={size} {...props} />
}
