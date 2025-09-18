import React from 'react'
import { Box } from '@chakra-ui/react'
import { Tooltip } from './Tooltip'
import { ViewType } from '../types/ViewTypes'

interface IconButtonProps {
  icon: React.ReactNode
  tooltip: string
  viewName?: ViewType
  isActive?: boolean
  onClick?: (viewName?: ViewType) => void
}

export function IconButton({
  icon,
  tooltip,
  viewName,
  isActive = false,
  onClick
}: IconButtonProps): React.JSX.Element {
  const handleClick = (): void => {
    if (onClick) {
      onClick(viewName)
    }
  }

  return (
    <Tooltip content={tooltip} positioning={{ placement: 'right' }} showArrow>
      <Box
        color={isActive ? 'app.light' : 'app.text'}
        bg={isActive ? 'app.accent' : 'transparent'}
        fontSize="lg"
        fontWeight="bold"
        cursor="pointer"
        display="flex"
        alignItems="center"
        justifyContent="center"
        w="100%"
        h="30px"
        borderRadius="4px"
        transition="all 0.2s"
        _hover={{
          color: 'app.light',
          bg: isActive ? 'app.accent' : 'rgba(255,255,255,0.1)'
        }}
        onClick={handleClick}
      >
        {icon}
      </Box>
    </Tooltip>
  )
}
