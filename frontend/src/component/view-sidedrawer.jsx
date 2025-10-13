import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// 导入不同类型的图标
import AssignmentIcon from '@mui/icons-material/Assignment';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import DescriptionIcon from '@mui/icons-material/Description';

export default function TemporaryDrawer() {
    const [open, setOpen] = React.useState(false);

    const toggleDrawer = (newOpen) => () => {
        setOpen(newOpen);
    };

    // 根据文本内容返回对应的图标
    const getIconForItem = (text) => {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('assignment')) {
            return <AssignmentIcon />;
        } else if (lowerText.includes('project')) {
            return <WorkIcon />;
        } else if (lowerText.includes('exam')) {
            return <SchoolIcon />;
        } else {
            return <DescriptionIcon />;
        }
    };

    const DrawerList = (
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
            <List>
                {['Assignment 1', 'Assignment 2', 'Assignment 3', 'Assignment 4'].map((text) => (
                    <ListItem key={text} disablePadding>
                        <ListItemButton>
                            <ListItemIcon>
                                {getIconForItem(text)}
                            </ListItemIcon>
                            <ListItemText primary={text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                {['Project 1', 'Mid Term Exam', 'Final exam'].map((text) => (
                    <ListItem key={text} disablePadding>
                        <ListItemButton>
                            <ListItemIcon>
                                {getIconForItem(text)}
                            </ListItemIcon>
                            <ListItemText primary={text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <div>
            <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 2 }}
                onClick={toggleDrawer(true)}
            >
                <MenuIcon sx={{ fontSize: 40 }} />   {/* Bigger icon */}
            </IconButton>

            <Drawer open={open} onClose={toggleDrawer(false)}>
                {DrawerList}
            </Drawer>
        </div>
    );
}