import { Children, isValidElement, type ReactNode, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { Accordion, Button as MantineButton, Paper, Text, Modal, Menu, ActionIcon, createTheme, type ButtonProps, type PaperProps } from '@mantine/core';
import { Ellipsis } from 'lucide-react';
import { modals } from '@mantine/modals';

export { TextInput, NativeSelect, Badge, ThemeIcon, Alert, Text, Title } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo', primaryShade: 7, defaultRadius: 'md',
  fontFamily: "'Anuphan Variable', sans-serif",
  headings: { fontFamily: "'Anuphan Variable', sans-serif", fontWeight: '700' },
  respectReducedMotion: true,
  components: {
    Button: MantineButton.extend({ defaultProps: { size: 'md', styles: { root: { minHeight: 44 }, label: { gap: 8, whiteSpace: 'normal' } } } }),
    Paper: Paper.extend({ defaultProps: { radius: 'lg', withBorder: true } }),
    Modal: Modal.extend({ defaultProps: { centered: true, radius: 'lg', padding: 'lg', overlayProps: { backgroundOpacity: .35, blur: 4 }, closeButtonProps: { 'aria-label': 'ปิดหน้าต่าง', size: 'xl' } } }),
  },
});

export function Button({ className = '', ...props }: ButtonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonProps>) {
  const variant = className.includes('primary') ? 'filled' : className.includes('secondary') ? 'default' : 'subtle';
  return <MantineButton variant={variant} color={className.includes('danger-text') ? 'red' : undefined} className={className} {...props} />;
}

export function Panel({ children, className = '', ...props }: PaperProps & Omit<HTMLAttributes<HTMLDivElement>, keyof PaperProps>) {
  return <Paper className={className} {...props}>{children}</Paper>;
}

export function Disclosure({ children, className }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children);
  const title = items.find(item => isValidElement(item) && item.type === 'summary');
  const body = items.filter(item => item !== title);
  return <Accordion className={className} variant="default"><Accordion.Item value="details"><Accordion.Control>{isValidElement<{ children: ReactNode }>(title) ? title.props.children : 'รายละเอียด'}</Accordion.Control><Accordion.Panel>{body}</Accordion.Panel></Accordion.Item></Accordion>;
}

export function RowActions({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <Menu position="bottom-start" shadow="md" width={180}><Menu.Target><ActionIcon variant="subtle" color="gray" size={44} data-row-trigger={id} aria-label={`จัดการ ${label}`}><Ellipsis size={20} /></ActionIcon></Menu.Target><Menu.Dropdown>{Children.map(children, child => {
    if (!isValidElement<ButtonProps & ButtonHTMLAttributes<HTMLButtonElement>>(child)) return null;
    const { children: content, onClick, className, 'aria-label': ariaLabel } = child.props;
    return <Menu.Item onClick={event => {
      [...document.querySelectorAll<HTMLElement>('[data-row-trigger]')].find(element => element.dataset.rowTrigger === id)?.focus({ preventScroll: true });
      onClick?.(event);
    }} data-return-to={id} color={className?.includes('danger-text') ? 'red' : undefined} aria-label={ariaLabel}>{content}</Menu.Item>;
  })}</Menu.Dropdown></Menu>;
}

export function confirmAction(message: string) {
  return new Promise<boolean>(resolve => {
    let modalId = '';
    modalId = modals.openConfirmModal({
      title: 'ยืนยันการทำรายการ', children: <Text size="sm">{message}</Text>,
      labels: { confirm: 'ยืนยัน', cancel: 'ยกเลิก' },
      confirmProps: { color: 'indigo' },
      closeOnClickOutside: false,
      closeOnEscape: false,
      onKeyDownCapture: event => {
        if (event.key === 'Escape') { event.stopPropagation(); resolve(false); modals.close(modalId); }
      },
      transitionProps: { duration: 0 },
      onConfirm: () => resolve(true), onCancel: () => resolve(false), onClose: () => resolve(false),
    });
  });
}
