'use client'

import * as React from 'react'
import { Menu } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'

function DropdownMenu({ ...props }: Menu.Root.Props) {
  return <Menu.Root {...props} />
}

function DropdownMenuTrigger({ ...props }: Menu.Trigger.Props) {
  return <Menu.Trigger {...props} />
}

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 4,
  ...props
}: Menu.Popup.Props &
  Pick<Menu.Positioner.Props, 'align' | 'sideOffset'>) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="isolate z-50">
        <Menu.Popup
          className={cn(
            'min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuItem({
  className,
  onClick,
  children,
  ...props
}: Menu.Item.Props) {
  return (
    <Menu.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </Menu.Item>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="separator"
      className={cn('-mx-1 my-1 h-px bg-muted', className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
