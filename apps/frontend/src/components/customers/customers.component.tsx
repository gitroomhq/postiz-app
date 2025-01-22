"use client";
import React, { useCallback, useEffect, useState } from "react";
import { deleteDialog } from "@gitroom/react/helpers/delete.dialog";
import { useFetch } from "@gitroom/helpers/utils/custom.fetch";
import { useToaster } from "@gitroom/react/toaster/toaster";
import { useRouter } from "next/navigation";
import { useModals } from "@mantine/modals";
import { AddUpdateCustomerForm } from "./add-update-customer";
import { Button } from "@gitroom/react/form/button";
import { Customer } from '@gitroom/frontend/components/customers/types';



const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const fetch = useFetch();
  const toast = useToaster();
  const router = useRouter();
  const modals = useModals();

  useEffect(() => {
    fetchCustomers();
  }, []);


  const openAddUpdateCustomerForm = useCallback(
    (currentCustomer: Customer | null) => {
      modals.openModal({
        classNames: {
          modal: 'bg-transparent text-textColor',
        },
        withCloseButton: false,
        children: <AddUpdateCustomerForm currentCustomer={currentCustomer} onCustomerUpdated={fetchCustomers} />,
      });
    },
    [modals]
  );

  const fetchCustomers = async () => {
    try {
      const apiUrl = `/customers`;
      const response = await fetch(apiUrl, {
        method: 'GET',
      });

      if (response.ok) {
        const result: Customer[] = await response.json();
        setCustomers(result || []);
      } else {
        toast.show(`Failed to fetch customers`, 'warning');
      }

    } catch (error) {
      toast.show(`Error fetching customers`, 'warning');
      console.error("Error fetching customers:", error);
    }
  };

  const handleDeleteCustomer = useCallback(async (id: string) => {
    if (
      await deleteDialog(
        'Are you sure you want to delete this customer?',
        'Yes, Delete'
      )
    ) {
      try {
        const apiUrl = `/customers/${id}`;
        const response = await fetch(apiUrl, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchCustomers();
        } else {
          toast.show(`Failed to delete customer: ${response.statusText}`, 'warning');

        }
      } catch (error) {
        toast.show(`Error deleting customer`, 'warning');
        console.error("Error delete customer:", error);
      }
    }
  }, []);

  const handleCustomerConfig = (customer: Customer) => {
    router.push(`/social-media?customerId=${customer.id}`);
  };


  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

        <Button
          className="rounded-[4px]"
          onClick={() => openAddUpdateCustomerForm(null)}
        >
          Add New Customer
        </Button>

      </div>


      <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "20px" }}>
        {customers.map((customer) => (
          <div
            key={customer.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "10px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
              <h4> <strong>{customer.name}</strong>  </h4>
              <p >{customer.email}</p>
              <p >{customer.phone}</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>

              <Button
                className="rounded-[4px]"
                onClick={() => handleCustomerConfig(customer)}
              >
                Social Media Config
              </Button>


              <Button
                className="rounded-[4px]"
                onClick={() => openAddUpdateCustomerForm(customer)}
              >
                Edit
              </Button>



              <Button
                className="rounded-[4px]"
                style={{
                  background: "#dc3545",
                }}
                onClick={() => handleDeleteCustomer(customer.id)}
              >
                Delete
              </Button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomersPage;
