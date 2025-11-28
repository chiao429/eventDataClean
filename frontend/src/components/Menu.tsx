import React from 'react';
import './Menu.css';

interface MenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Menu: React.FC<MenuProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'team-divider', label: '小隊分隊', icon: '👥' },
    { id: 'worker-attendance', label: '同工出席名單', icon: '🙋' },
    { id: 'team-list', label: '小隊名單', icon: '📝' }
  ];

  return (
    <nav className="menu">
      <div className="menu-container">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Menu;
