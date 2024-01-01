import './LoadingSpinner.css'


interface LoadingSpinnerProps {
    isLoading: boolean;
}

export default function LoadingSpinner({ isLoading }: LoadingSpinnerProps) {
    const displayValue = isLoading ? "block" : "none";
    return (
        <div id="loading-indicator" style={{display: displayValue}}>
            <div className="spinner"></div>
            <div>Loading...</div>
        </div>
    );
}