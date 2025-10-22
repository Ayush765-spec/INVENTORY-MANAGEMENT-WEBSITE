import {BarChart3, Package, Plus, Settings} from "lucide-react";
import Link from "next/link";
import { UserButton } from "@stackframe/stack";

export default function Sidebar({currentPath="/dashboard"}:{currentPath:string}){
    const navigation = [
        {name:"Dashboard", href:'/dashboard', icon:BarChart3},
        {name:"Inventory", href:'/inventory', icon:Package},
        {name:"Add Product", href:'/add-product', icon:Plus},
        {name:"Settings", href:'/settings', icon:Settings}
    ];

    return(
        <div className="fixed left-0 top-0 bg-gray-900 text-white w-64 min-h-screen p-6 z-10">
            <div className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                    <BarChart3 className="w-7 h-7"/>
                    <span className="text-lg font-semibold">YOUR INVENTORY APP</span>
                </div>
            </div>

            <nav className="space-y-1">
                <div className="text-sm font-semibold text-gray-400 uppercase mb-2">Inventory</div>
                {navigation.map((item, key) => {
                    const Icon = item.icon;
                    const isActive = currentPath === item.href;
                    
                    return (
                        <Link 
                            key={key} 
                            href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                isActive 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
                <div className="flex items-center justify-between">
                    <UserButton showUserInfo />
                </div>
            </div>
        </div>
    );
}