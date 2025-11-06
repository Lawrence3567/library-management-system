import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import './FineRules.css';
import useAuth from '../../hooks/useAuth';

interface FineRule {
  id: string;
  amount_per_day: number;
  updated_at: string;
}

const FIXED_RULE_ID = '00000000-0000-0000-0000-000000000000';

const FineRules: React.FC = () => {
  const [currentRule, setCurrentRule] = useState<FineRule | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchCurrentRule();
  }, []);

  const fetchCurrentRule = async () => {
    try {
      const { data, error } = await supabase
        .from('fine_rules')
        .select('*')
        .eq('id', FIXED_RULE_ID)
        .single();

      if (error) throw error;
      setCurrentRule(data);
      setNewAmount(data?.amount_per_day?.toString() || '');
    } catch (error) {
      console.error('Error fetching fine rule:', error);
      setError('Failed to load fine rule');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      const { error } = await supabase
        .from('fine_rules')
        .update({
          amount_per_day: amount,
          last_updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', FIXED_RULE_ID);

      if (error) throw error;

      setSuccess('Fine rule has been updated successfully');
      fetchCurrentRule();
    } catch (error) {
      console.error('Error updating fine rule:', error);
      setError('Failed to update fine rule');
    }
  };

  return (
    <div className="fine-rules-container">
      <div className="fine-rules-header">
        <h1>Fine Rules Management</h1>
        <p>Set the fine amount per day for overdue books</p>
      </div>

      <form className="fine-rules-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="amount">Fine Amount (RM) per Day</label>
          <input
            type="number"
            id="amount"
            step="0.01"
            min="0"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Enter amount (e.g., 1.00)"
            required
          />
        </div>
        <button type="submit" className="submit-button">
          Update
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="fine-rules-current">
        <h2>Current Fine Rule</h2>
        <div className="fine-rules-info">
          {currentRule ? (
            <>
              <p className="current-amount">
                Current fine amount: <strong>RM {currentRule.amount_per_day.toFixed(2)}</strong> per day
              </p>
              <p className="last-updated">
                Last updated: {new Date(currentRule.updated_at).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="no-rule">No fine rule configured</p>
          )}
        </div>
      </div>

      <div className="fine-rules-actions">
        <h2>Manual Actions</h2>
        <div className="actions-container">
          <button 
            className="process-fines-button" 
            onClick={async () => {
              try {
                setError('');
                setSuccess('');
                const { error: processError } = await supabase.rpc('process_daily_fines');
                if (processError) throw processError;
                setSuccess('Fines calculation has been processed successfully');
              } catch (err) {
                console.error('Error processing fines:', err);
                setError('Failed to process fines calculation');
              }
            }}
          >
            Process Fines Calculation
          </button>
          <p className="action-description">
            This will manually run the daily fines calculation process for all overdue books, to simulate the scheduled job that runs everyday for calculating overdue fines.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FineRules;